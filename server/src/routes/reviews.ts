import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, HttpError } from "../lib/http.js";
import {
  scheduleReview,
  initialState,
  type Rating,
  type SchedulingState,
} from "../lib/spacedRepetition.js";

export const reviewsRouter = Router();

const VALID_RATINGS: Rating[] = ["again", "hard", "good", "easy"];

/**
 * GET /api/reviews/queue — problems whose next-review date has arrived,
 * ordered by urgency (most overdue first).
 */
reviewsRouter.get(
  "/queue",
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const due = await prisma.problem.findMany({
      where: { progress: { nextReviewDate: { lte: now } } },
      include: { progress: true },
      orderBy: { progress: { nextReviewDate: "asc" } },
    });
    res.json(due);
  })
);

/**
 * POST /api/reviews — record a review and reschedule via SM-2.
 * Body: { problemId, rating }
 *
 * This is the one place scheduling state is mutated. It:
 *   1. loads the problem's current scheduling state,
 *   2. runs the pure SM-2 function to get the next state + due date + XP,
 *   3. writes an immutable ReviewLog and updates UserProgress in a transaction.
 */
reviewsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { problemId, rating } = req.body ?? {};

    if (typeof problemId !== "string") {
      throw new HttpError(400, "problemId is required");
    }
    if (!VALID_RATINGS.includes(rating)) {
      throw new HttpError(400, `rating must be one of ${VALID_RATINGS.join(", ")}`);
    }

    const progress = await prisma.userProgress.findUnique({ where: { problemId } });
    if (!progress) {
      throw new HttpError(404, "problem not found");
    }

    const currentState: SchedulingState = {
      repetitions: progress.repetitions,
      easeFactor: progress.easeFactor,
      intervalDays: progress.intervalDays,
    };

    const now = new Date();
    const result = scheduleReview(currentState, rating as Rating, now);

    // Spaced repetition schedules in whole days: store the next due date at local
    // midnight so a card due "today" stays due all day, not from this minute.
    const nextReviewDate = new Date(result.nextReviewDate);
    nextReviewDate.setHours(0, 0, 0, 0);

    const [, updatedProgress] = await prisma.$transaction([
      prisma.reviewLog.create({
        data: {
          problemId,
          rating,
          quality: result.quality,
          intervalDays: result.intervalDays,
          easeFactor: result.easeFactor,
          xp: result.xp,
          reviewedAt: now,
        },
      }),
      prisma.userProgress.update({
        where: { problemId },
        data: {
          repetitions: result.repetitions,
          easeFactor: result.easeFactor,
          intervalDays: result.intervalDays,
          nextReviewDate,
          lastReviewedAt: now,
        },
      }),
    ]);

    res.json({
      progress: updatedProgress,
      xpEarned: result.xp,
      intervalDays: result.intervalDays,
      nextReviewDate,
    });
  })
);

// Re-export so other modules can build fresh state if ever needed.
export { initialState };
