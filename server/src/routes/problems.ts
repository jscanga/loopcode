import { Router } from "express";
import { prisma } from "../db.js";
import { asyncHandler, HttpError } from "../lib/http.js";
import { isDifficulty, isPattern } from "../lib/patterns.js";

export const problemsRouter = Router();

/** GET /api/problems — every problem with its current scheduling state. */
problemsRouter.get(
  "/",
  asyncHandler(async (_req, res) => {
    const problems = await prisma.problem.findMany({
      include: { progress: true },
      orderBy: { createdAt: "asc" },
    });
    res.json(problems);
  })
);

/**
 * POST /api/problems — add a new problem to the deck.
 * Body: { title, url, pattern, difficulty }
 * A fresh UserProgress row is created so the problem shows up as "due today".
 */
problemsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const { title, url, pattern, difficulty } = req.body ?? {};

    if (typeof title !== "string" || title.trim().length === 0) {
      throw new HttpError(400, "title is required");
    }
    if (typeof url !== "string" || !/^https?:\/\//.test(url)) {
      throw new HttpError(400, "url must be a valid http(s) link");
    }
    if (!isPattern(pattern)) {
      throw new HttpError(400, "pattern must be one of the 8 core patterns");
    }
    if (!isDifficulty(difficulty)) {
      throw new HttpError(400, "difficulty must be easy, medium, or hard");
    }

    const problem = await prisma.problem.create({
      data: {
        title: title.trim(),
        url: url.trim(),
        pattern,
        difficulty,
        // New problems are due immediately (nextReviewDate defaults to now()).
        progress: { create: {} },
      },
      include: { progress: true },
    });

    res.status(201).json(problem);
  })
);

/** DELETE /api/problems/:id — remove a problem (cascades to logs/progress). */
problemsRouter.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await prisma.problem.delete({ where: { id: req.params.id } });
    res.status(204).end();
  })
);
