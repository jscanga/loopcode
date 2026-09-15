import { describe, it, expect } from "vitest";
import {
  scheduleReview,
  updateEaseFactor,
  nextInterval,
  initialState,
  addDays,
  RATING_QUALITY,
  RATING_XP,
  INITIAL_EASE_FACTOR,
  MIN_EASE_FACTOR,
  FIRST_INTERVAL,
  SECOND_INTERVAL,
  type SchedulingState,
} from "./spacedRepetition.js";

const NOW = new Date("2026-01-01T12:00:00.000Z");

describe("updateEaseFactor", () => {
  it("leaves the ease factor essentially unchanged on a perfect (q=5) review", () => {
    // SM-2: EF' = EF + (0.1 - 0*(...)) = EF + 0.1
    expect(updateEaseFactor(2.5, 5)).toBe(2.6);
  });

  it("lowers the ease factor on a 'good' (q=4) review", () => {
    // EF + (0.1 - 1*(0.08 + 1*0.02)) = EF + (0.1 - 0.1) = EF
    expect(updateEaseFactor(2.5, 4)).toBe(2.5);
  });

  it("lowers the ease factor more sharply on a 'hard' (q=3) review", () => {
    // EF + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 0.24) = 2.36
    expect(updateEaseFactor(2.5, 3)).toBeCloseTo(2.36, 5);
  });

  it("drops the ease factor on a lapse (q=1)", () => {
    expect(updateEaseFactor(2.5, 1)).toBeLessThan(2.5);
  });

  it("never drops below the 1.3 floor", () => {
    let ef = 1.4;
    for (let i = 0; i < 20; i++) ef = updateEaseFactor(ef, 0);
    expect(ef).toBe(MIN_EASE_FACTOR);
  });
});

describe("nextInterval (successful reviews)", () => {
  it("uses a fixed 1-day interval on the first success", () => {
    expect(nextInterval(0, 0, 2.5, "good")).toBe(FIRST_INTERVAL);
  });

  it("uses a fixed 6-day interval on the second success", () => {
    expect(nextInterval(1, 1, 2.5, "good")).toBe(SECOND_INTERVAL);
  });

  it("compounds by the ease factor from the third success on", () => {
    // round(6 * 2.5) = 15
    expect(nextInterval(2, 6, 2.5, "good")).toBe(15);
  });

  it("grows more gently for a 'hard' success than a 'good' one", () => {
    const hard = nextInterval(2, 6, 2.5, "hard");
    const good = nextInterval(2, 6, 2.5, "good");
    expect(hard).toBeLessThan(good);
    expect(hard).toBe(Math.max(SECOND_INTERVAL + 1, Math.round(6 * 1.2))); // 7
  });
});

describe("scheduleReview", () => {
  it("initial state matches SM-2 defaults", () => {
    expect(initialState()).toEqual({
      repetitions: 0,
      easeFactor: INITIAL_EASE_FACTOR,
      intervalDays: 0,
    });
  });

  it("schedules a new problem one day out after the first 'good'", () => {
    const result = scheduleReview(initialState(), "good", NOW);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
    expect(result.nextReviewDate).toEqual(addDays(NOW, 1));
    expect(result.quality).toBe(RATING_QUALITY.good);
    expect(result.xp).toBe(RATING_XP.good);
  });

  it("walks the classic 1 → 6 → 15 day ramp over three 'good' reviews", () => {
    let state: SchedulingState = initialState();
    const first = scheduleReview(state, "good", NOW);
    expect(first.intervalDays).toBe(1);

    state = toState(first);
    const second = scheduleReview(state, "good", NOW);
    expect(second.intervalDays).toBe(6);

    state = toState(second);
    const third = scheduleReview(state, "good", NOW);
    expect(third.intervalDays).toBe(15); // round(6 * 2.5)
    expect(third.repetitions).toBe(3);
  });

  it("resets repetitions and reschedules tomorrow on 'again' (a lapse)", () => {
    // Build up some progress first.
    let state: SchedulingState = { repetitions: 4, easeFactor: 2.5, intervalDays: 40 };
    const result = scheduleReview(state, "again", NOW);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
    expect(result.nextReviewDate).toEqual(addDays(NOW, 1));
    expect(result.easeFactor).toBeLessThan(2.5);
  });

  it("awards the most XP for an honest 'again'", () => {
    const again = scheduleReview(initialState(), "again", NOW).xp;
    const hard = scheduleReview(initialState(), "hard", NOW).xp;
    const good = scheduleReview(initialState(), "good", NOW).xp;
    const easy = scheduleReview(initialState(), "easy", NOW).xp;
    expect(again).toBeGreaterThan(hard);
    expect(hard).toBeGreaterThan(good);
    expect(good).toBeGreaterThan(easy);
  });

  it("is deterministic given a fixed 'now'", () => {
    const a = scheduleReview(initialState(), "easy", NOW);
    const b = scheduleReview(initialState(), "easy", NOW);
    expect(a).toEqual(b);
  });

  it("keeps 'easy' intervals ahead of 'good' intervals over the long run", () => {
    let easyState: SchedulingState = initialState();
    let goodState: SchedulingState = initialState();
    for (let i = 0; i < 5; i++) {
      easyState = toState(scheduleReview(easyState, "easy", NOW));
      goodState = toState(scheduleReview(goodState, "good", NOW));
    }
    expect(easyState.intervalDays).toBeGreaterThan(goodState.intervalDays);
    expect(easyState.easeFactor).toBeGreaterThan(goodState.easeFactor);
  });
});

function toState(r: {
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
}): SchedulingState {
  return {
    repetitions: r.repetitions,
    easeFactor: r.easeFactor,
    intervalDays: r.intervalDays,
  };
}
