import express from "express";
import cors from "cors";
import { problemsRouter } from "./routes/problems.js";
import { reviewsRouter } from "./routes/reviews.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { statsRouter } from "./routes/stats.js";

/**
 * Builds the Express app (routes + middleware) WITHOUT calling `listen`.
 *
 * This is exported so two entry points can share it:
 *   - src/index.ts       → local dev, calls app.listen()
 *   - api/[...path].ts    → Vercel serverless function, exports the app directly
 */
export function createApp() {
  const app = express();

  app.use(cors());

  // Parse JSON bodies. Guard it because some serverless platforms (Vercel)
  // pre-parse the request body; running express.json() again on an
  // already-consumed stream would overwrite it with `{}`. Locally, req.body is
  // undefined here so the parser runs normally.
  const jsonParser = express.json();
  app.use((req, res, next) => {
    if (req.body !== undefined && req.body !== null) return next();
    jsonParser(req, res, next);
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "loopcode-api" });
  });

  app.use("/api/problems", problemsRouter);
  app.use("/api/reviews", reviewsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/stats", statsRouter);

  // Centralised error handler so route handlers can just throw.
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      _next: express.NextFunction
    ) => {
      const message = err instanceof Error ? err.message : "Internal server error";
      const status = (err as { status?: number })?.status ?? 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: message });
    }
  );

  return app;
}
