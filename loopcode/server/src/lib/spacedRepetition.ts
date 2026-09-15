/**
 * spacedRepetition.ts — the technical heart of LoopCode.
 *
 * This module implements the SM-2 algorithm (SuperMemo 2, Piotr Woźniak, 1987),
 * the same family of algorithm that powers Anki. It is written as a set of PURE
 * functions with no I/O and no database access so it can be reasoned about and
 * unit-tested in isolation (see spacedRepetition.test.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY SPACED REPETITION FOR CODING INTERVIEWS?
 *
 * The "forgetting curve" (Ebbinghaus) says memory of a newly-learned item
 * decays exponentially. Grinding a LeetCode problem once gives you the illusion
 * of mastery; two weeks later the *pattern* (e.g. "sliding window") is gone.
 * Spaced repetition fights this by scheduling each item for review at expanding
 * intervals timed to just before you'd forget it — converting short-term recall
 * into durable long-term memory with the fewest possible reviews.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE ALGORITHM
 *
 * Each problem carries three pieces of scheduling state:
 *   - repetitions:  how many times in a row it has been recalled successfully.
 *   - easeFactor:   a per-item multiplier (starts 2.5) describing how "easy" the
 *                   item is. Higher ease → intervals grow faster.
 *   - intervalDays: the current gap in days until the next review.
 *
 * On each review the learner self-rates recall quality. LoopCode uses the
 * four Anki-style buttons and maps them to SM-2's 0-5 quality scale:
 *
 *   Again → 1   (failed to recall the pattern)
 *   Hard  → 3   (recalled with serious difficulty)
 *   Good  → 4   (recalled correctly with some effort)
 *   Easy  → 5   (recalled effortlessly)
 *
 * SM-2 treats any quality < 3 as a lapse: repetitions reset to 0 and the item
 * is scheduled again the next day. Otherwise the interval grows:
 *   rep 1 → 1 day, rep 2 → 6 days, rep n → round(previousInterval * easeFactor).
 *
 * The ease factor is then nudged by the classic SM-2 formula:
 *   EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
 * and clamped to a floor of 1.3 so a chronically-hard item never collapses to a
 * zero-growth loop.
 *
 * LoopCode adds ONE small, clearly-labelled deviation from textbook SM-2: a
 * "Hard" success uses a gentler 1.2× interval growth instead of the full ease
 * multiplier, matching Anki's behaviour and learner expectations. This is
 * isolated in `nextInterval` and easy to remove.
 */

// ── Public types ────────────────────────────────────────────────────────────

/** The four Anki-style self-assessment buttons shown after each review. */
export type Rating = "again" | "hard" | "good" | "easy";

/** Scheduling state SM-2 reads and updates for a single problem. */
export interface SchedulingState {
  /** Consecutive successful recalls (resets to 0 on a lapse). */
  repetitions: number;
  /** SM-2 ease factor; starts at 2.5, floored at 1.3. */
  easeFactor: number;
  /** Current interval in days until the next review. */
  intervalDays: number;
}

/** Result of scheduling a review: the new state plus the next due date and XP. */
export interface ReviewResult extends SchedulingState {
  /** Quality score (0-5) that the rating mapped to. */
  quality: number;
  /** Absolute date the problem next becomes due. */
  nextReviewDate: Date;
  /** XP awarded for this review. */
  xp: number;
}

// ── Constants ───────────────────────────────────────────────────────────────

/** Ease factor for a brand-new problem, per SM-2. */
export const INITIAL_EASE_FACTOR = 2.5;

/** SM-2's hard floor on the ease factor. */
export const MIN_EASE_FACTOR = 1.3;

/** Interval (days) applied after the first successful review. */
export const FIRST_INTERVAL = 1;

/** Interval (days) applied after the second successful review. */
export const SECOND_INTERVAL = 6;

/** Multiplier applied to the interval on a "Hard" (but still successful) review. */
export const HARD_INTERVAL_MULTIPLIER = 1.2;

/** Maps each button to the SM-2 quality score (0-5). */
export const RATING_QUALITY: Record<Rating, number> = {
  again: 1,
  hard: 3,
  good: 4,
  easy: 5,
};

/**
 * XP awarded per rating.
 *
 * Design note: "Again" is worth the MOST XP. Coding practice only works if you
 * are honest about what you have and haven't retained, but the natural incentive
 * is to click "Good" to feel productive. Rewarding honest failures the most
 * removes the incentive to game the streak and keeps the schedule accurate.
 */
export const RATING_XP: Record<Rating, number> = {
  again: 20,
  hard: 15,
  good: 10,
  easy: 6,
};

/** The initial scheduling state for a newly-added problem. */
export function initialState(): SchedulingState {
  return { repetitions: 0, easeFactor: INITIAL_EASE_FACTOR, intervalDays: 0 };
}

// ── Core SM-2 functions ─────────────────────────────────────────────────────

/**
 * Update the ease factor after a review using the canonical SM-2 formula.
 * A lower quality lowers the ease (intervals will grow more slowly); the result
 * is clamped so it never drops below {@link MIN_EASE_FACTOR}.
 */
export function updateEaseFactor(easeFactor: number, quality: number): number {
  const updated =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASE_FACTOR, roundTo(updated, 2));
}

/**
 * Compute the next interval (in whole days) for a SUCCESSFUL review
 * (quality >= 3). Lapses are handled by {@link scheduleReview}, not here.
 *
 * @param repetitionsSoFar repetitions *before* this review is counted.
 * @param previousInterval the interval that just elapsed.
 * @param easeFactor       the (already updated) ease factor.
 * @param rating           used only to apply the gentler "Hard" multiplier.
 */
export function nextInterval(
  repetitionsSoFar: number,
  previousInterval: number,
  easeFactor: number,
  rating: Rating
): number {
  // First two successful reviews use SM-2's fixed ramp of 1 day then 6 days.
  if (repetitionsSoFar === 0) return FIRST_INTERVAL;
  if (repetitionsSoFar === 1) return SECOND_INTERVAL;

  // From the third review on, the interval compounds by the ease factor —
  // except a "Hard" success grows more gently (LoopCode/Anki convention).
  const multiplier = rating === "hard" ? HARD_INTERVAL_MULTIPLIER : easeFactor;
  return Math.max(SECOND_INTERVAL + 1, Math.round(previousInterval * multiplier));
}

/**
 * Apply a review to a problem's scheduling state and return the new state,
 * the next due date, and the XP earned. This is the single entry point the API
 * calls; it is deterministic given `now`, which makes it trivially testable.
 *
 * @param state  the problem's current scheduling state.
 * @param rating the learner's self-assessment.
 * @param now    the review time (injected so tests are deterministic).
 */
export function scheduleReview(
  state: SchedulingState,
  rating: Rating,
  now: Date = new Date()
): ReviewResult {
  const quality = RATING_QUALITY[rating];
  const xp = RATING_XP[rating];

  // The ease factor always moves, even on a lapse.
  const easeFactor = updateEaseFactor(state.easeFactor, quality);

  let repetitions: number;
  let intervalDays: number;

  if (quality < 3) {
    // Lapse: forget the streak and re-show tomorrow so it's re-learned quickly.
    repetitions = 0;
    intervalDays = FIRST_INTERVAL;
  } else {
    intervalDays = nextInterval(
      state.repetitions,
      state.intervalDays,
      easeFactor,
      rating
    );
    repetitions = state.repetitions + 1;
  }

  return {
    repetitions,
    easeFactor,
    intervalDays,
    quality,
    xp,
    nextReviewDate: addDays(now, intervalDays),
  };
}

// ── Small date/number helpers (kept local so the module has no dependencies) ──

/** Return a new Date `days` days after `date` (whole-day granularity). */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

/** Round to `digits` decimal places without floating-point noise. */
export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
