import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/http.js";
import { computeStreak } from "../lib/streak.js";
import { groupMasteryByPattern } from "../lib/aggregations.js";
import { PATTERNS } from "../lib/patterns.js";

export const statsRouter = Router();

/**
 * GET /api/stats — top-line numbers for the header and mastery map:
 * streak, total XP, due-today count, and per-pattern mastery levels.
 */
statsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const now = new Date();

    const [problems, reviews, dueCount, xpAgg] = await Promise.all([
      prisma.problem.findMany({ include: { progress: true } }),
      prisma.reviewLog.findMany({ select: { reviewedAt: true } }),
      prisma.userProgress.count({ where: { nextReviewDate: { lte: now } } }),
      prisma.reviewLog.aggregate({ _sum: { xp: true } }),
    ]);

    const streak = computeStreak(
      reviews.map((r) => r.reviewedAt),
      now
    );

    // Derive per-pattern mastery from each problem's progress.
    const mastery = groupMasteryByPattern(
      problems.map((p) => ({
        pattern: p.pattern,
        progress: p.progress
          ? { repetitions: p.progress.repetitions, easeFactor: p.progress.easeFactor }
          : null,
      })),
      PATTERNS
    );

    res.json({
      streak,
      totalXp: xpAgg._sum.xp ?? 0,
      totalReviews: reviews.length,
      dueToday: dueCount,
      totalProblems: problems.length,
      mastery,
    });
  })
);
