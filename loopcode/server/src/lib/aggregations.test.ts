import { describe, it, expect } from "vitest";
import {
  buildDueForecast,
  buildRetentionTrend,
  groupMasteryByPattern,
} from "./aggregations.js";

const NOW = new Date("2026-02-15T10:00:00");

function atDay(offset: number, hour = 12): Date {
  const d = new Date("2026-02-15T00:00:00");
  d.setDate(d.getDate() + offset);
  d.setHours(hour, 0, 0, 0);
  return d;
}

describe("buildDueForecast", () => {
  it("produces one bucket per day", () => {
    const points = buildDueForecast([], NOW, 14);
    expect(points).toHaveLength(14);
    expect(points.every((p) => p.count === 0)).toBe(true);
  });

  it("buckets future due dates on the right day", () => {
    const points = buildDueForecast([atDay(0), atDay(3), atDay(3)], NOW, 14);
    expect(points[0].count).toBe(1);
    expect(points[3].count).toBe(2);
  });

  it("rolls overdue items into today", () => {
    const points = buildDueForecast([atDay(-5), atDay(-1)], NOW, 14);
    expect(points[0].count).toBe(2);
  });

  it("ignores due dates beyond the forecast window", () => {
    const points = buildDueForecast([atDay(30)], NOW, 14);
    expect(points.reduce((s, p) => s + p.count, 0)).toBe(0);
  });
});

describe("buildRetentionTrend", () => {
  it("produces one point per day with null accuracy on empty days", () => {
    const trend = buildRetentionTrend([], NOW, 30);
    expect(trend).toHaveLength(30);
    expect(trend.every((t) => t.accuracy === null && t.reviews === 0)).toBe(true);
  });

  it("computes accuracy as the share of quality>=3 reviews", () => {
    const reviews = [
      { reviewedAt: atDay(-1), quality: 5 },
      { reviewedAt: atDay(-1), quality: 4 },
      { reviewedAt: atDay(-1), quality: 1 }, // a lapse
      { reviewedAt: atDay(-1), quality: 3 },
    ];
    const trend = buildRetentionTrend(reviews, NOW, 30);
    const yesterday = trend[trend.length - 2];
    expect(yesterday.reviews).toBe(4);
    expect(yesterday.accuracy).toBe(75); // 3 of 4 recalled
  });
});

describe("groupMasteryByPattern", () => {
  const patterns = ["Two Pointers", "Graphs"];

  it("returns a row for every pattern even with no problems", () => {
    const rows = groupMasteryByPattern([], patterns);
    expect(rows.map((r) => r.pattern)).toEqual(patterns);
    expect(rows.every((r) => r.level === 0 && r.totalCount === 0)).toBe(true);
  });

  it("counts problems and reflects progress", () => {
    const rows = groupMasteryByPattern(
      [
        { pattern: "Two Pointers", progress: { repetitions: 5, easeFactor: 2.7 } },
        { pattern: "Two Pointers", progress: null },
        { pattern: "Graphs", progress: { repetitions: 0, easeFactor: 2.5 } },
      ],
      patterns
    );
    const tp = rows.find((r) => r.pattern === "Two Pointers")!;
    const graphs = rows.find((r) => r.pattern === "Graphs")!;
    expect(tp.totalCount).toBe(2);
    expect(tp.level).toBeGreaterThan(graphs.level);
  });
});
