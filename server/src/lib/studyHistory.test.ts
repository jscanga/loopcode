import { describe, it, expect } from "vitest";
import { simulateStudyHistory } from "./studyHistory.js";
import { computeStreak } from "./streak.js";

const TODAY = new Date("2026-06-01T09:00:00");

describe("simulateStudyHistory", () => {
  it("is deterministic for a given seed", () => {
    const a = simulateStudyHistory(40, { today: TODAY, seed: 1 });
    const b = simulateStudyHistory(40, { today: TODAY, seed: 1 });
    expect(a.reviews.length).toBe(b.reviews.length);
    expect(a.reviews.map((r) => r.rating)).toEqual(b.reviews.map((r) => r.rating));
  });

  it("produces one progress row per problem", () => {
    const { progress } = simulateStudyHistory(40, { today: TODAY });
    expect(progress).toHaveLength(40);
    expect(new Set(progress.map((p) => p.problemIndex)).size).toBe(40);
  });

  it("generates a real review history", () => {
    const { reviews } = simulateStudyHistory(40, { today: TODAY });
    expect(reviews.length).toBeGreaterThan(40);
    // Every review is dated before today.
    expect(reviews.every((r) => r.reviewedAt < TODAY)).toBe(true);
  });

  it("keeps the daily streak intact (reviews on every history day)", () => {
    const { reviews } = simulateStudyHistory(40, {
      today: TODAY,
      historyDays: 21,
    });
    const streak = computeStreak(
      reviews.map((r) => r.reviewedAt),
      TODAY
    );
    // Last simulated review is "yesterday", so a 21-day run should be alive.
    expect(streak.current).toBe(21);
  });

  it("leaves some problems due today for the review queue", () => {
    const { progress } = simulateStudyHistory(40, { today: TODAY });
    const due = progress.filter((p) => p.nextReviewDate <= TODAY);
    expect(due.length).toBeGreaterThan(0);
  });

  it("schedules some problems into the future (forecast has data)", () => {
    const { progress } = simulateStudyHistory(40, { today: TODAY });
    const future = progress.filter((p) => p.nextReviewDate > TODAY);
    expect(future.length).toBeGreaterThan(0);
  });
});
