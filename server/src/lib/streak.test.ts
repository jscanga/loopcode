import { describe, it, expect } from "vitest";
import { computeStreak, dayKey } from "./streak.js";

const NOW = new Date("2026-01-10T09:00:00");

function daysAgo(n: number): Date {
  const d = new Date(NOW.getTime());
  d.setDate(d.getDate() - n);
  return d;
}

describe("computeStreak", () => {
  it("returns zeros with no reviews", () => {
    expect(computeStreak([], NOW)).toEqual({
      current: 0,
      longest: 0,
      reviewedToday: false,
    });
  });

  it("counts a single review today as a streak of 1", () => {
    const info = computeStreak([daysAgo(0)], NOW);
    expect(info.current).toBe(1);
    expect(info.reviewedToday).toBe(true);
  });

  it("counts consecutive days including today", () => {
    const info = computeStreak([daysAgo(0), daysAgo(1), daysAgo(2)], NOW);
    expect(info.current).toBe(3);
  });

  it("keeps the streak alive if the last review was yesterday (not yet reviewed today)", () => {
    const info = computeStreak([daysAgo(1), daysAgo(2)], NOW);
    expect(info.current).toBe(2);
    expect(info.reviewedToday).toBe(false);
  });

  it("breaks the streak after a fully missed day", () => {
    const info = computeStreak([daysAgo(2), daysAgo(3)], NOW);
    expect(info.current).toBe(0);
  });

  it("collapses multiple reviews on the same day into one streak day", () => {
    const info = computeStreak([daysAgo(0), daysAgo(0), daysAgo(1)], NOW);
    expect(info.current).toBe(2);
  });

  it("tracks the longest historical streak separately from the current one", () => {
    // A 4-day run last week, broken, then a 1-day run today.
    const dates = [
      daysAgo(9),
      daysAgo(8),
      daysAgo(7),
      daysAgo(6),
      daysAgo(0),
    ];
    const info = computeStreak(dates, NOW);
    expect(info.longest).toBe(4);
    expect(info.current).toBe(1);
  });
});

describe("dayKey", () => {
  it("formats as YYYY-MM-DD", () => {
    expect(dayKey(new Date("2026-03-05T23:59:00"))).toBe("2026-03-05");
  });
});
