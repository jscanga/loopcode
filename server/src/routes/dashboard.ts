import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/http.js";
import {
  buildDueForecast,
  buildRetentionTrend,
  groupMasteryByPattern,
} from "../lib/aggregations.js";
import { PATTERNS } from "../lib/patterns.js";

export const dashboardRouter = Router();

const FORECAST_DAYS = 14;
const TREND_DAYS = 30;

/**
 * GET /api/dashboard — data for the three dashboard charts:
 *   a) reviews due over the next 14 days (forecast),
 *   b) retention/accuracy trend over the last 30 days,
 *   c) weakest patterns by mastery score.
 *
 * The route only fetches rows; all shaping lives in pure, tested helpers.
 */
dashboardRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const trendStart = new Date(now);
    trendStart.setHours(0, 0, 0, 0);
    trendStart.setDate(trendStart.getDate() - (TREND_DAYS - 1));

    const [progresses, problems, reviews] = await Promise.all([
      prisma.userProgress.findMany({ select: { nextReviewDate: true } }),
      prisma.problem.findMany({ include: { progress: true } }),
      prisma.reviewLog.findMany({
        where: { reviewedAt: { gte: trendStart } },
        select: { reviewedAt: true, quality: true },
      }),
    ]);

    const dueForecast = buildDueForecast(
      progresses.map((p) => p.nextReviewDate),
      now,
      FORECAST_DAYS
    );

    const retentionTrend = buildRetentionTrend(
      reviews.map((r) => ({ reviewedAt: r.reviewedAt, quality: r.quality })),
      now,
      TREND_DAYS
    );

    const weakestPatterns = groupMasteryByPattern(
      problems.map((p) => ({
        pattern: p.pattern,
        progress: p.progress
          ? { repetitions: p.progress.repetitions, easeFactor: p.progress.easeFactor }
          : null,
      })),
      PATTERNS
    )
      .sort((a, b) => a.score - b.score)
      .slice(0, 5);

    res.json({ dueForecast, retentionTrend, weakestPatterns });
  })
);
