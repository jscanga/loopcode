import { describe, it, expect } from "vitest";
import {
  masteryScore,
  scoreToLevel,
  patternMastery,
  MAX_MASTERY_LEVEL,
  REPS_FOR_FULL_CREDIT,
} from "./mastery.js";
import { INITIAL_EASE_FACTOR } from "./spacedRepetition.js";

describe("masteryScore", () => {
  it("is 0 for a pattern with no problems", () => {
    expect(masteryScore([])).toBe(0);
  });

  it("is 0 for freshly-added, never-reviewed problems", () => {
    // repetitions 0 and ease at the default should not read as mastery.
    const score = masteryScore([
      { repetitions: 0, easeFactor: INITIAL_EASE_FACTOR },
      { repetitions: 0, easeFactor: INITIAL_EASE_FACTOR },
    ]);
    expect(score).toBeLessThan(0.5);
  });

  it("rises with more successful repetitions", () => {
    const low = masteryScore([{ repetitions: 1, easeFactor: 2.5 }]);
    const high = masteryScore([{ repetitions: REPS_FOR_FULL_CREDIT, easeFactor: 2.7 }]);
    expect(high).toBeGreaterThan(low);
  });

  it("stays within 0-1", () => {
    const score = masteryScore([{ repetitions: 100, easeFactor: 5 }]);
    expect(score).toBeLessThanOrEqual(1);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

describe("scoreToLevel", () => {
  it("maps 0 → 0 and 1 → max level", () => {
    expect(scoreToLevel(0)).toBe(0);
    expect(scoreToLevel(1)).toBe(MAX_MASTERY_LEVEL);
  });

  it("clamps out-of-range scores", () => {
    expect(scoreToLevel(-1)).toBe(0);
    expect(scoreToLevel(2)).toBe(MAX_MASTERY_LEVEL);
  });
});

describe("patternMastery", () => {
  it("reports reviewed vs total counts", () => {
    const result = patternMastery(
      "Two Pointers",
      [
        { repetitions: 3, easeFactor: 2.6 },
        { repetitions: 0, easeFactor: 2.5 },
      ],
      2
    );
    expect(result.pattern).toBe("Two Pointers");
    expect(result.reviewedCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.level).toBeGreaterThanOrEqual(0);
    expect(result.level).toBeLessThanOrEqual(MAX_MASTERY_LEVEL);
  });
});
