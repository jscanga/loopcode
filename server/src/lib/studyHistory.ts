/**
 * studyHistory.ts — generate a realistic, reproducible study history by running
 * the REAL SM-2 scheduler day by day. Used by the seed script so the app opens
 * with a populated dashboard, mastery map, and streak.
 *
 * Kept pure (no DB, no wall-clock reads beyond the injected `today`) so it can be
 * unit-tested: given the same seed it always produces the same history.
 */

import { scheduleReview, initialState, type Rating, type SchedulingState } from "./spacedRepetition.js";

export interface SimReview {
  problemIndex: number;
  rating: Rating;
  quality: number;
  intervalDays: number;
  easeFactor: number;
  xp: number;
  reviewedAt: Date;
}

export interface SimProgress {
  problemIndex: number;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  nextReviewDate: Date;
  lastReviewedAt: Date | null;
  introduced: boolean;
}

export interface SimulationResult {
  reviews: SimReview[];
  progress: SimProgress[];
}

export interface SimulationOptions {
  /** "Today" at local midnight is the reference point; history ends yesterday. */
  today: Date;
  historyDays?: number;
  maxReviewsPerDay?: number;
  seed?: number;
}

/** Deterministic PRNG so the seeded history is reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/**
 * Floor a date to local midnight. Spaced repetition schedules in whole days, so
 * a card due "today" should be due from 00:00 — not from the exact minute it was
 * last reviewed. This keeps the review queue populated all day.
 */
function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function simulateStudyHistory(
  problemCount: number,
  opts: SimulationOptions
): SimulationResult {
  const historyDays = opts.historyDays ?? 21;
  // A realistic daily budget: the simulated learner reviews at most this many
  // problems per day, so a natural backlog of due cards accumulates (as it does
  // in real practice) rather than everything being perfectly cleared each day.
  const maxPerDay = opts.maxReviewsPerDay ?? 6;
  const rand = mulberry32(opts.seed ?? 20260915);

  const today = new Date(opts.today);
  today.setHours(0, 0, 0, 0);

  /** Draw a rating from a realistic distribution (mostly "good"). */
  const pickRating = (): Rating => {
    const r = rand();
    if (r < 0.12) return "again";
    if (r < 0.32) return "hard";
    if (r < 0.82) return "good";
    return "easy";
  };

  interface Sim {
    index: number;
    state: SchedulingState;
    nextReview: Date;
    introDay: number;
    introduced: boolean;
    lastReviewedAt: Date | null;
  }

  // Introduce ~2 problems per day across the window, oldest first.
  const sims: Sim[] = Array.from({ length: problemCount }, (_, index) => {
    const introDay = -historyDays + Math.floor(index / 2);
    return {
      index,
      state: initialState(),
      nextReview: addDays(today, introDay),
      introDay,
      introduced: false,
      lastReviewedAt: null,
    };
  });

  const reviews: SimReview[] = [];

  for (let d = -historyDays; d <= -1; d++) {
    const dayDate = addDays(today, d);

    for (const sim of sims) {
      if (!sim.introduced && sim.introDay === d) sim.introduced = true;
    }

    const due = sims
      .filter((s) => s.introduced && s.nextReview <= addDays(dayDate, 1))
      .sort((a, b) => a.nextReview.getTime() - b.nextReview.getTime())
      .slice(0, maxPerDay);

    for (const sim of due) {
      const rating = pickRating();
      // Reviews land in the evening, minute/hour jittered for realism.
      const reviewedAt = new Date(dayDate);
      reviewedAt.setHours(17 + Math.floor(rand() * 4), Math.floor(rand() * 50), 0, 0);

      const result = scheduleReview(sim.state, rating, reviewedAt);
      reviews.push({
        problemIndex: sim.index,
        rating,
        quality: result.quality,
        intervalDays: result.intervalDays,
        easeFactor: result.easeFactor,
        xp: result.xp,
        reviewedAt,
      });

      sim.state = {
        repetitions: result.repetitions,
        easeFactor: result.easeFactor,
        intervalDays: result.intervalDays,
      };
      // Schedule at day granularity so due-today problems surface all day.
      sim.nextReview = startOfDay(result.nextReviewDate);
      sim.lastReviewedAt = reviewedAt;
    }
  }

  const progress: SimProgress[] = sims.map((sim) => ({
    problemIndex: sim.index,
    repetitions: sim.state.repetitions,
    easeFactor: sim.state.easeFactor,
    intervalDays: sim.state.intervalDays,
    // Problems never introduced stay brand-new and due today.
    nextReviewDate: sim.introduced ? sim.nextReview : today,
    lastReviewedAt: sim.lastReviewedAt,
    introduced: sim.introduced,
  }));

  return { reviews, progress };
}
